import React, { useState, useRef, useEffect } from 'react';
import { useCalendarAssistant } from '../../hooks/useCalendarAssistant';
import { useThemeStore } from '../../store/themeStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHistory from './ChatHistory';
import { Chat } from '../../types/chat';

interface CalendarChatProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  chats: Chat[];
  onLoadChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export default function CalendarChat({ 
  showHistory, 
  setShowHistory,
  chats,
  onLoadChat,
  onDeleteChat
}: CalendarChatProps) {
  const { messages, loading, sendMessage, clearMessages, setMessages } = useCalendarAssistant();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleLoadChat = (event: CustomEvent<Chat>) => {
      clearMessages();
      setMessages(event.detail.messages.map(msg => ({
        text: msg.text,
        isUser: msg.isUser,
        timestamp: new Date().toISOString(),
        status: 'sent'
      })));
      setShowHistory(false);
    };

    window.addEventListener('load-calendar-chat', handleLoadChat as EventListener);
    return () => {
      window.removeEventListener('load-calendar-chat', handleLoadChat as EventListener);
    };
  }, [clearMessages, setMessages, setShowHistory]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {showHistory ? (
          <div className="h-full overflow-y-auto">
            <ChatHistory
              chats={chats}
              onSelectChat={(chat) => onLoadChat(chat.id)}
              onDeleteChat={onDeleteChat}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <div 
            ref={messagesContainerRef}
            className="h-full overflow-y-auto"
          >
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="mt-auto border-t dark:border-gray-700">
        <div className="p-4">
          <MessageInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyPress={handleKeyPress}
            loading={loading}
            placeholder="Try: 'Add a meeting tomorrow at 2pm' or 'Show my events for today'"
          />
        </div>
      </div>
    </div>
  );
}