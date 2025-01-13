import { useState, useCallback } from 'react';
import { CalendarMessage, CalendarChatState } from '../types';
import { Chat } from '../../../types/chat';
import { CalendarAssistant } from '../../../services/calendarAssistant';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

export function useCalendarChat(userId: string | undefined) {
  const [state, setState] = useState<CalendarChatState>({
    messages: [{
      text: "Hi! I'm your calendar assistant. I can help you manage your schedule - try asking me to add events or show your upcoming schedule!",
      isUser: false,
      timestamp: new Date().toISOString(),
      status: 'sent'
    }],
    activeChatId: null
  });

  const loadChat = useCallback((chat: Chat) => {
    if (chat.mode === 'calendar') {
      logger.info('Loading calendar chat:', { chatId: chat.id });
      
      const formattedMessages: CalendarMessage[] = chat.messages.map(msg => ({
        text: msg.text,
        isUser: msg.isUser,
        action: msg.action,
        timestamp: new Date().toISOString(),
        status: 'sent'
      }));

      setState({
        messages: formattedMessages,
        activeChatId: chat.id
      });

      // Reset and rebuild CalendarAssistant context
      CalendarAssistant.clearContext();
      formattedMessages.forEach(msg => {
        CalendarAssistant['messageHistory'].push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }
  }, []);

  const saveChat = useCallback(async (newMessages: CalendarMessage[]) => {
    if (!userId) return;

    try {
      const chatData = {
        id: state.activeChatId || undefined,
        user_id: userId,
        title: newMessages[newMessages.length - 2]?.text.slice(0, 50) || 'Calendar Chat',
        messages: newMessages.map(({ timestamp, status, ...msg }) => msg),
        mode: 'calendar' as const,
        updated_at: new Date().toISOString(),
        created_at: state.activeChatId ? undefined : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chats')
        .upsert(chatData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setState(prev => ({ ...prev, activeChatId: data.id }));
      }

      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage?.action?.includes('_event')) {
        window.dispatchEvent(new CustomEvent('calendar-update'));
      }
    } catch (error) {
      logger.error('Error saving chat:', error);
    }
  }, [userId, state.activeChatId]);

  const addMessage = useCallback(async (message: CalendarMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));

    await saveChat([...state.messages, message]);
  }, [state.messages, saveChat]);

  return {
    messages: state.messages,
    activeChatId: state.activeChatId,
    loadChat,
    addMessage
  };
}
