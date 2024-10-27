import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface Chat {
  id: string;
  title: string;
  messages: Array<{ text: string; isBot: boolean }>;
  created_at: string;
}

interface ChatHistoryProps {
  messages: Array<{ text: string; isBot: boolean }>;
  isDarkMode: boolean;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  activeChat: string | null;
}

export default function ChatHistory({ 
  messages, 
  isDarkMode,
  onNewChat,
  onLoadChat,
  activeChat
}: ChatHistoryProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChats(data);
    }
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (!error) {
      loadChats();
    }
  };

  return (
    <div className={`w-64 h-full fixed left-0 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4 overflow-y-auto`}>
      <button
        onClick={onNewChat}
        className={`w-full mb-4 p-2 rounded-lg flex items-center gap-2 ${
          isDarkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700' 
            : 'bg-white text-gray-900 hover:bg-gray-100'
        }`}
      >
        <Plus size={16} />
        <span>New Chat</span>
      </button>

      <div className="space-y-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`p-2 rounded-lg text-sm ${
              activeChat === chat.id
                ? isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                : isDarkMode ? 'bg-gray-800' : 'bg-white'
            } hover:bg-opacity-80 cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2 flex-1 truncate"
                onClick={() => onLoadChat(chat.id)}
              >
                <MessageSquare size={16} />
                <span>{chat.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}