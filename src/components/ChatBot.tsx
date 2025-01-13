import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ErrorMessage from './ErrorMessage';
import { MessageSquare, History, X, Calendar, RotateCcw } from 'lucide-react';
import CalendarChat from './calendar-assistant/CalendarChat';
import { logger } from '../utils/logger';
import { Chat } from '../types/chat';
import { Switch } from './ui/Switch';

interface ChatBotProps {
  onClose?: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { 
      text: "Hi! How can I help you today?",
      isBot: true 
    }
  ]);
  const [input, setInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [mode, setMode] = useState<'chat' | 'calendar'>('chat');
  const [messageHistory, setMessageHistory] = useState<Array<Array<{ text: string; isBot: boolean }>>>([]);
  const { isDarkMode } = useThemeStore();
  const { generateStreamResponse, loading, error, clearError } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, mode]);

  const loadChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setChats(data);
      }
    } catch (error) {
      logger.error('Error loading chats:', error);
    }
  };

  const handleLoadChat = async (chatId: string) => {
    try {
      const { data, error: findError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (findError) throw findError;

      if (data) {
        if (mode === 'calendar') {
          window.dispatchEvent(new CustomEvent('load-calendar-chat', { detail: data }));
        } else {
          setMessages(data.messages.map((m: any) => ({ 
            text: m.text, 
            isBot: !m.isUser 
          })));
        }
        setActiveChatId(chatId);
        setShowHistory(false);
      }
    } catch (error) {
      logger.error('Error loading chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    } catch (error) {
      logger.error('Error deleting chat:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { text: userMessage, isBot: false }];
    setMessageHistory(prev => [...prev, messages]);
    setMessages(newMessages);
    setInput('');
    clearError();

    try {
      let fullResponse = '';
      await generateStreamResponse(userMessage, (chunk) => {
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
      });

      const chatData = {
        id: activeChatId || undefined,
        user_id: user.id,
        title: userMessage.slice(0, 50),
        messages: [...newMessages, { text: fullResponse, isBot: true }].map(m => ({
          text: m.text,
          isUser: !m.isBot
        })),
        mode,
        updated_at: new Date().toISOString(),
        created_at: activeChatId ? undefined : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chats')
        .upsert(chatData)
        .select()
        .single();

      if (error) throw error;
      if (data?.id) {
        setActiveChatId(data.id);
      }

      await loadChats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessages(prev => [...prev, { 
        text: `Error: ${errorMessage}`, 
        isBot: true 
      }]);
      logger.error('Error sending message:', err);
    }
  };

  const handleUndo = () => {
    if (messageHistory.length > 0) {
      const previousMessages = messageHistory[messageHistory.length - 1];
      setMessages(previousMessages);
      setMessageHistory(prev => prev.slice(0, -1));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModeSwitch = () => {
    const newMode = mode === 'chat' ? 'calendar' : 'chat';
    setMode(newMode);
    setMessages([{ 
      text: newMode === 'chat' 
        ? "Hi! How can I help you today?"
        : "Hi! I'm your calendar assistant. I can help you manage your schedule!",
      isBot: true 
    }]);
    setActiveChatId(null);
    setShowHistory(false);
    setMessageHistory([]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-theme-primary text-white flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className={mode === 'chat' ? 'text-white' : 'text-white/60'} />
            <Switch
              checked={mode === 'calendar'}
              onCheckedChange={() => handleModeSwitch()}
              className="data-[state=checked]:bg-white/20"
            />
            <Calendar size={16} className={mode === 'calendar' ? 'text-white' : 'text-white/60'} />
          </div>
          <span className="font-medium">
            {mode === 'chat' ? 'AI Assistant' : 'Calendar Assistant'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messageHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Undo last message"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Chat history"
          >
            <History size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'calendar' ? (
          <CalendarChat 
            showHistory={showHistory} 
            setShowHistory={setShowHistory}
            chats={chats}
            onLoadChat={handleLoadChat}
            onDeleteChat={handleDeleteChat}
          />
        ) : (
          <div className="flex flex-col h-full">
            {showHistory ? (
              <div className="h-full overflow-y-auto" ref={chatHistoryRef}>
                <div className="p-4 space-y-2">
                  {chats.length === 0 ? (
                    <p className="text-gray-500 text-center">No chat history yet</p>
                  ) : (
                    chats.map((chat) => (
                      <div
                        key={chat.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                      >
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => handleLoadChat(chat.id)}
                        >
                          <MessageSquare size={16} />
                          <span className="truncate">{chat.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
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
                </div>

                <div className="mt-auto border-t dark:border-gray-700">
                  <div className="p-4">
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
