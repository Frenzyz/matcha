import React, { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { CalendarAssistant } from '../services/calendarAssistant';
import { useAuth } from '../context/AuthContext';

interface Message {
  text: string;
  isUser: boolean;
  action?: string;
}

export default function CalendarAssistant() {
  const [messages, setMessages] = useState<Message[]>([
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
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.isUser
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.action && (
                <span className="text-xs opacity-75 mt-1 block">
                  Action: {message.action}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Try: 'Add a meeting tomorrow at 2pm' or 'Show my events for today'"
            className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}