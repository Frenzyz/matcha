import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

export function useConnection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const CHECK_INTERVAL = 30000; // 30 seconds
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const checkSupabaseConnection = useCallback(async () => {
    // Only check if enough time has passed since last check
    const now = Date.now();
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return isSupabaseConnected;
    }

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        const isConnected = !error;
        setIsSupabaseConnected(isConnected);
        setLastCheckTime(now);
        return isConnected;
      } catch (err) {
        retries++;
        if (retries === MAX_RETRIES) {
          setIsSupabaseConnected(false);
          setLastCheckTime(now);
          logger.error('Failed to connect to Supabase after max retries');
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries - 1)));
      }
    }
    return false;
  }, [isSupabaseConnected, lastCheckTime]);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    checkSupabaseConnection();
  }, [checkSupabaseConnection]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsSupabaseConnected(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    checkSupabaseConnection();

    // Periodic connection check
    const interval = setInterval(checkSupabaseConnection, CHECK_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [handleOnline, handleOffline, checkSupabaseConnection]);

  return {
    isOnline,
    isSupabaseConnected,
    checkConnection: checkSupabaseConnection
  };
}
