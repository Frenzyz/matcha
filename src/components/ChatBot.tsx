import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useOllama } from '../services/ollama';

export default function ChatBot() {
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { text: "Hi! I'm your UNCC mentor assistant. How can I help you today?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const { isDarkMode } = useThemeStore();
  const { generateResponse, isLoading, error } = useOllama();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInput('');

    try {
      const response = await generateResponse(userMessage);
      if (response) {
        setMessages(prev => [...prev, { text: response, isBot: true }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        text: "I'm having trouble connecting to the local Ollama service. Please make sure it's running.", 
        isBot: true 
      }]);
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-5rem)] ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm ml-64`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.isBot
                  ? `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {error && (
          <div className="text-red-500 text-center p-2">
            {error}
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about your schedule..."
            className={`flex-1 p-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}