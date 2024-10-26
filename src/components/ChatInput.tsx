import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  loading: boolean;
  isDarkMode: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  input,
  setInput,
  onSend,
  onKeyPress,
  loading,
  isDarkMode,
  disabled
}: ChatInputProps) {
  return (
    <div className="p-4 border-t dark:border-gray-700">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Ask me anything about your academic journey..."
          className={`flex-1 p-2 rounded-lg border resize-none ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          disabled={disabled}
          rows={1}
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim() || disabled}
          className={`p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex-shrink-0 ${
            (loading || !input.trim() || disabled) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
}