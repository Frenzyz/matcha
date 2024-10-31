import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

export function useConnection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const CHECK_INTERVAL = 30000; // 30 seconds

  const checkSupabaseConnection = useCallback(async () => {
    // Only check if enough time has passed since last check
    const now = Date.now();
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return isSupabaseConnected;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      const isConnected = !error;
      setIsSupabaseConnected(isConnected);
      setLastCheckTime(now);
      return isConnected;
    } catch (err) {
      setIsSupabaseConnected(false);
      setLastCheckTime(now);
      return false;
    }
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