import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export function useRoomMessages(roomId: string) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('study_room_messages')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      logger.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    const setupSubscription = () => {
      const channel = supabase.channel(`messages:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'study_room_messages',
            filter: `room_id=eq.${roomId}`
          },
          () => {
            // Simply refresh the messages when a new one arrives
            loadMessages();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Subscribed to room messages');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Failed to subscribe to room messages');
            setError('Failed to connect to chat');
          }
        });

      return channel;
    };

    // Initial load
    loadMessages();

    // Set up subscription
    const channel = setupSubscription();
    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [roomId, loadMessages]);

  const sendMessage = async (content: string): Promise<void> => {
    if (!user) throw new Error('Must be logged in to send messages');
    if (!content.trim()) throw new Error('Message cannot be empty');

    try {
      const { error } = await supabase
        .from('study_room_messages')
        .insert([{
          room_id: roomId,
          user_id: user.id,
          content: content.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Refresh messages immediately after sending
      await loadMessages();
    } catch (err) {
      logger.error('Error sending message:', err);
      throw new Error('Failed to send message');
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage
  };
}
