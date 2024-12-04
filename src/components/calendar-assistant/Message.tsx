import React from 'react';

interface MessageProps {
  text: string;
  isUser: boolean;
  action?: string;
}

export default function Message({ text, isUser, action }: MessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          isUser
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700'
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        {action && (
          <span className="text-xs opacity-75 mt-1 block">
            Action: {action}
          </span>
        )}
      </div>
    </div>
  );
}