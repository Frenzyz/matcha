import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel = supabase.channel('system');

    const setupConnection = async () => {
      try {
        channel = channel
          .on('presence', { event: 'sync' }, () => {
            setIsConnected(true);
            setError(null);
            logger.info('Realtime connection synced');
          })
          .on('presence', { event: 'join' }, () => {
            setIsConnected(true);
            setError(null);
            logger.info('Realtime connection joined');
          })
          .on('presence', { event: 'leave' }, () => {
            setIsConnected(false);
            logger.warn('Realtime connection left');
          })
          .on('system', { event: '*' }, (payload) => {
            if (payload.type === 'error') {
              setError(payload.message);
              logger.error('Realtime system error:', payload);
            }
          });

        const status = await channel.subscribe();
        if (status !== 'SUBSCRIBED') {
          throw new Error(`Failed to subscribe to channel: ${status}`);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to establish realtime connection');
        logger.error('Realtime connection error:', err);
      }
    };

    setupConnection();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    isConnected,
    error
  };
}