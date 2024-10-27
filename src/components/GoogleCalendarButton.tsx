import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Calendar } from 'lucide-react';

interface GoogleCalendarButtonProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
}

export default function GoogleCalendarButton({ onSuccess, onError }: GoogleCalendarButtonProps) {
  const login = useGoogleLogin({
    onSuccess: (response) => onSuccess(response.access_token),
    onError: (error) => onError?.(error),
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  });

  return (
    <button
      onClick={() => login()}
      className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-hover transition-colors"
    >
      <Calendar size={20} />
      <span>Connect Google Calendar</span>
    </button>
  );
}