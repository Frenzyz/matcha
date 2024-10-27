import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ErrorMessage from './ErrorMessage';
import ChatHistory from './ChatHistory';

interface ChatBotProps {
  isParentMode?: boolean;
}

export default function ChatBot({ isParentMode = false }: ChatBotProps) {
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { 
      text: isParentMode 
        ? "Hey kiddo! 👋 How can I help?" 
        : "Hi! How can I help you today?",
      isBot: true 
    }
  ]);
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const { isDarkMode } = useThemeStore();
  const { generateStreamResponse, loading, error, clearError } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveChat = async (newMessages: typeof messages) => {
    if (!user) return;

    const chatData = {
      user_id: user.id,
      title: newMessages[1]?.text.slice(0, 50) || 'New Chat',
      messages: newMessages,
      updated_at: new Date().toISOString()
    };

    if (activeChatId) {
      await supabase
        .from('chats')
        .update(chatData)
        .eq('id', activeChatId);
    } else {
      const { data } = await supabase
        .from('chats')
        .insert({ ...chatData, created_at: new Date().toISOString() })
        .select();
      if (data?.[0]) {
        setActiveChatId(data[0].id);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { text: userMessage, isBot: false }];
    setMessages(newMessages);
    setInput('');
    clearError();

    try {
      let fullResponse = '';
      await generateStreamResponse(
        `${isParentMode ? 'Respond briefly as a caring parent. Use dad jokes and puns. ' : 'Respond concisely. '}${userMessage}`,
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
      await saveChat([...newMessages, { text: fullResponse, isBot: true }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessages(prev => [...prev, { 
        text: `Error: ${errorMessage}`, 
        isBot: true 
      }]);
    }
  };

  const handleNewChat = () => {
    setMessages([messages[0]]);
    setActiveChatId(null);
  };

  const handleLoadChat = async (chatId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('messages')
      .eq('id', chatId)
      .single();

    if (!error && data) {
      setMessages(data.messages);
      setActiveChatId(chatId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      <ChatHistory 
        messages={messages} 
        isDarkMode={isDarkMode}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        activeChat={activeChatId}
      />
      
      <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm ml-64`}>
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
    </div>
  );
}