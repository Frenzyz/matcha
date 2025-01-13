import React from 'react';

interface ChatMessageProps {
  text: string;
  isBot: boolean;
  isDarkMode: boolean;
}

export default function ChatMessage({ text, isBot, isDarkMode }: ChatMessageProps) {
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          isBot
            ? `${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`
            : 'bg-emerald-500 text-white'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
