import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Calendar, Loader2 } from 'lucide-react';

interface GoogleCalendarButtonProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
}

export default function GoogleCalendarButton({ onSuccess, onError }: GoogleCalendarButtonProps) {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      if (!response.access_token) {
        onError?.(new Error('No access token received'));
        return;
      }
      setLoading(true);
      onSuccess(response.access_token);
      setLoading(false);
    },
    onError: (error) => onError?.(new Error(error.error_description || 'Failed to connect to Google Calendar')),
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
    flow: 'implicit'
  });

  return (
    <button
      onClick={() => login()}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Calendar className="h-5 w-5" />
      )}
      <span>{loading ? 'Connecting...' : 'Connect Google Calendar'}</span>
    </button>
  );
}