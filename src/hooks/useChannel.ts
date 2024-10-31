import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface ChannelConfig {
  event: string;
  schema?: string;
  table?: string;
  filter?: string;
}

export function useChannel(
  channelName: string,
  config: ChannelConfig,
  callback: (payload: any) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const setupChannel = () => {
      // Clean up existing subscription if any
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      // Create new channel
      const channel = supabase.channel(channelName);

      // Set up event handling
      channel
        .on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter
          },
          callback
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info(`Subscribed to channel: ${channelName}`);
          } else if (status === 'CLOSED') {
            logger.warn(`Channel closed: ${channelName}`);
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`Channel error: ${channelName}`);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, config, callback]);

  return channelRef.current;
}