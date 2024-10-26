import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useWebLLM } from '../hooks/useWebLLM';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingState from './LoadingState';

export default function ChatBot() {
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { text: "Hi! I'm your UNCC mentor assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const { isDarkMode } = useThemeStore();
  const { generateResponse, loading, error, initialized, initProgress } = useWebLLM();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !initialized) return;

    const userMessage = input;
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');

    try {
      const response = await generateResponse(userMessage);
      setMessages(prev => [...prev, { text: response, isBot: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        text: "I'm having trouble responding right now. Please try again later.", 
        isBot: true 
      }]);
    }
  };

  if (!initialized) {
    return <LoadingState initProgress={initProgress} />;
  }

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
          <div className="text-red-500 text-center p-2">
            {error}
          </div>
        )}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        loading={loading}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}