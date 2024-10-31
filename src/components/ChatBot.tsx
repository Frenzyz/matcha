import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ErrorMessage from './ErrorMessage';
import { MessageSquare, History, X } from 'lucide-react';

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
  const [showHistory, setShowHistory] = useState(false);
  const [chats, setChats] = useState<Array<{ id: string; title: string }>>([]);
  const { isDarkMode } = useThemeStore();
  const { generateStreamResponse, loading, error, clearError } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('id, title')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setChats(data);
    }
  };

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
    loadChats();
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
    setShowHistory(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showHistory ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Recent Chats</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={16} />
              </button>
            </div>
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleLoadChat(chat.id)}
                className="w-full p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  <span className="truncate">{chat.title}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="flex items-center px-4 py-2 border-t dark:border-gray-700">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Chat history"
        >
          <History size={20} />
        </button>
        <div className="flex-1 mx-2">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onKeyPress={handleKeyPress}
            loading={loading}
            isDarkMode={isDarkMode}
            disabled={loading || showHistory}
          />
        </div>
      </div>
    </div>
  );
}