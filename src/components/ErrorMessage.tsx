import React from 'react';
import { XCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-red-100 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}