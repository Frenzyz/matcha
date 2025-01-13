import { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

export function useRealtimeMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('study_room_messages')
          .select(`
            *,
            profiles (
              first_name,
              last_name
            )
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        logger.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    const setupSubscription = () => {
      const channel = supabase.channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'study_room_messages',
            filter: `room_id=eq.${roomId}`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const { data, error } = await supabase
                .from('study_room_messages')
                .select(`
                  *,
                  profiles (
                    first_name,
                    last_name
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!error && data) {
                setMessages(current => [...current, data]);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Subscribed to chat messages');
          }
        });

      return channel;
    };

    loadMessages();
    channelRef.current = setupSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId]);

  const sendMessage = async (content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('study_room_messages')
        .insert([{
          room_id: roomId,
          user_id: user.id,
          content,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage
  };
}
