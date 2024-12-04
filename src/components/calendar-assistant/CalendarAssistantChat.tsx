import React, { useState, useRef, useEffect } from 'react';
import { useCalendarAssistant } from '../../hooks/useCalendarAssistant';
import { useCalendarChatHistory } from '../../hooks/useCalendarChatHistory';
import { useThemeStore } from '../../store/themeStore';
import { History, X } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHistory from './ChatHistory';
import { Chat } from '../../types/chat';

export default function CalendarAssistantChat() {
  const { messages, loading, sendMessage, clearMessages, setMessages } = useCalendarAssistant();
  const { chats, saveChat, deleteChat } = useCalendarChatHistory();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);

    // Save chat after each message
    if (messages.length > 1) {
      await saveChat(messages, message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectChat = (chat: Chat) => {
    clearMessages();
    setMessages(chat.messages.map(msg => ({
      text: msg.text,
      isUser: msg.isUser,
      timestamp: new Date().toISOString(),
      status: 'sent'
    })));
    setShowHistory(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-theme-primary text-white flex justify-between items-center">
        <span className="font-medium">Calendar Assistant</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Chat history"
          >
            <History size={16} />
          </button>
          {showHistory && (
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Close history"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {showHistory ? (
          <ChatHistory
            chats={chats}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            isDarkMode={isDarkMode}
          />
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t dark:border-gray-700">
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
  );
}