import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  loading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  loading
}: ChatInputProps) {
  return (
    <div className="flex gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 p-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white disabled:opacity-50"
        rows={1}
      />
      <button
        onClick={onSend}
        disabled={disabled || loading || !value.trim()}
        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send size={20} />
        )}
      </button>
    </div>
  );
}
