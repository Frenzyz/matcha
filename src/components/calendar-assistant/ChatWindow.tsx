import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CalendarAssistant } from '../../services/calendarAssistant';
import Message from './Message';
import ChatInput from './ChatInput';

interface ChatMessage {
  text: string;
  isUser: boolean;
  action?: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      text: "Hi! I'm your calendar assistant. How can I help you manage your schedule?",
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInput('');
    setLoading(true);

    try {
      const { response, action } = await CalendarAssistant.processCommand(user.id, userMessage);
      setMessages(prev => [...prev, { text: response, isUser: false, action }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error processing your request.',
        isUser: false 
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, user]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <Message
            key={index}
            text={message.text}
            isUser={message.isUser}
            action={message.action}
          />
        ))}
      </div>

      <div className="p-4 border-t dark:border-gray-700">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onKeyPress={handleKeyPress}
          loading={loading}
        />
      </div>
    </div>
  );
}