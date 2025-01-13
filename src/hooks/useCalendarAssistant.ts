import { useState, useCallback } from 'react';
import { CalendarAssistant } from '../services/calendarAssistant';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface CalendarMessage {
  text: string;
  isUser: boolean;
  action?: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
}

export function useCalendarAssistant() {
  const [messages, setMessages] = useState<CalendarMessage[]>([{
    text: "Hi! I'm your calendar assistant. I can help you manage your schedule - try asking me to add events or show your upcoming schedule!",
    isUser: false,
    timestamp: new Date().toISOString(),
    status: 'sent'
  }]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    const userMessage: CalendarMessage = {
      text: text.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const { response, action } = await CalendarAssistant.processCommand(user.id, text);
      
      const assistantMessage: CalendarMessage = {
        text: response,
        isUser: false,
        action,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      const newMessages = [...messages, { ...userMessage, status: 'sent' }, assistantMessage];
      setMessages(newMessages);

      // Save chat after each message
      const chatData = {
        user_id: user.id,
        title: text.slice(0, 50),
        messages: newMessages.map(({ timestamp, status, ...msg }) => msg),
        mode: 'calendar' as const,
        updated_at: new Date().toISOString()
      };

      const { error: chatError } = await supabase
        .from('chats')
        .upsert(chatData);

      if (chatError) {
        logger.error('Error saving chat:', chatError);
      }

      if (action?.includes('_event')) {
        window.dispatchEvent(new CustomEvent('calendar-update'));
      }
    } catch (error) {
      logger.error('Error processing calendar command:', error);
      
      const errorMessage: CalendarMessage = {
        text: error instanceof Error ? error.message : 'Sorry, I encountered an error processing your request.',
        isUser: false,
        timestamp: new Date().toISOString(),
        status: 'error'
      };

      setMessages(prev => [...prev, { ...userMessage, status: 'error' }, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [messages, user]);

  const clearMessages = useCallback(() => {
    setMessages([{
      text: "Hi! I'm your calendar assistant. I can help you manage your schedule - try asking me to add events or show your upcoming schedule!",
      isUser: false,
      timestamp: new Date().toISOString(),
      status: 'sent'
    }]);
    CalendarAssistant.clearContext();
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
    setMessages
  };
}
