import React from 'react';
import { CalendarMessage } from './types';

interface MessageListProps {
  messages: CalendarMessage[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
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
            {message.status === 'error' && (
              <span className="text-xs text-red-500 mt-1 block">
                Failed to process command
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}