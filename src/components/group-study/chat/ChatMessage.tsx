import React from 'react';
import { format } from 'date-fns';

interface ChatMessageProps {
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  senderName?: string;
}

export default function ChatMessage({ content, timestamp, isCurrentUser, senderName }: ChatMessageProps) {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] min-w-0 rounded-lg p-3 ${
        isCurrentUser 
          ? 'bg-emerald-500 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
      }`}>
        {!isCurrentUser && senderName && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
            {senderName}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
        <div className="text-xs opacity-75 mt-1">
          {format(new Date(timestamp), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}
