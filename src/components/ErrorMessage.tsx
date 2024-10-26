import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
      {message.includes('settings') && (
        <p className="mt-1 text-sm text-gray-500">
          Visit the settings page to configure your calendar.
        </p>
      )}
    </div>
  );
}