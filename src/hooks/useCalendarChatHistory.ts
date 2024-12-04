import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Chat } from '../types/chat';
import { logger } from '../utils/logger';

export function useCalendarChatHistory() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchChats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', 'calendar')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setChats(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chat history';
      setError(message);
      logger.error('Error loading chat history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveChat = useCallback(async (messages: any[], title?: string) => {
    if (!user || messages.length === 0) return;

    try {
      const chatData = {
        user_id: user.id,
        title: title || messages[messages.length - 2]?.text?.slice(0, 50) || 'Calendar Chat',
        messages: messages.map(({ timestamp, status, ...msg }) => msg),
        mode: 'calendar' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chats')
        .insert([chatData])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setChats(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      logger.error('Error saving chat:', err);
      throw err;
    }
  }, [user]);

  const updateChat = useCallback(async (chatId: string, messages: any[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chats')
        .update({
          messages: messages.map(({ timestamp, status, ...msg }) => msg),
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchChats();
    } catch (err) {
      logger.error('Error updating chat:', err);
      throw err;
    }
  }, [user, fetchChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (err) {
      logger.error('Error deleting chat:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user, fetchChats]);

  return {
    chats,
    loading,
    error,
    saveChat,
    updateChat,
    deleteChat,
    fetchChats
  };
}