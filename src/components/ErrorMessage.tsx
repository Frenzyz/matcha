import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  code?: string;
  context?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function ErrorMessage({
  message,
  code,
  context,
  onDismiss,
  onRetry
}: ErrorMessageProps) {
  return (
    <div className="rounded-lg bg-red-50 p-4">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-700">{message}</p>
          {(code || context) && (
            <p className="mt-1 text-xs text-red-500">
              {code && <span className="font-mono">[{code}] </span>}
              {context && <span>{context}</span>}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-700 hover:bg-red-100"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-1 rounded-md p-1.5 text-red-500 hover:bg-red-100 hover:text-red-600"
            >
              <span className="sr-only">Dismiss</span>
              <span aria-hidden="true">&times;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}