import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ErrorMessage from './ErrorMessage';

export default function ChatBot() {
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { text: "Hi! I'm your UNCC mentor assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const { isDarkMode } = useThemeStore();
  const { generateStreamResponse, loading, error, clearError } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');
    clearError();

    try {
      let fullResponse = '';
      await generateStreamResponse(
        userMessage,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[newMessages.length - 1]?.isBot) {
              newMessages[newMessages.length - 1].text = fullResponse;
            } else {
              newMessages.push({ text: fullResponse, isBot: true });
            }
            return newMessages;
          });
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessages(prev => [...prev, { 
        text: `I apologize, but I'm having trouble responding right now. ${errorMessage}`, 
        isBot: true 
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-5rem)] ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm ml-64`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            text={message.text}
            isBot={message.isBot}
            isDarkMode={isDarkMode}
          />
        ))}
        <div ref={messagesEndRef} />
        {error && (
          <ErrorMessage 
            message={error}
            onDismiss={clearError}
          />
        )}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        loading={loading}
        isDarkMode={isDarkMode}
        disabled={loading}
      />
    </div>
  );
}