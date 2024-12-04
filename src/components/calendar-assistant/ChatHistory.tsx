import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Chat } from '../../types/chat';

interface ChatHistoryProps {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  isDarkMode: boolean;
}

export default function ChatHistory({
  chats,
  onSelectChat,
  onDeleteChat,
  isDarkMode
}: ChatHistoryProps) {
  return (
    <div className="p-4 space-y-2">
      {chats.length === 0 ? (
        <p className="text-center text-gray-500">No chat history yet</p>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            className={`p-3 rounded-lg cursor-pointer ${
              isDarkMode
                ? 'hover:bg-gray-700/50'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={() => onSelectChat(chat)}
              >
                <MessageSquare size={16} />
                <span className="truncate">{chat.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}