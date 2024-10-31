import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Calendar } from 'lucide-react';
import CalendarSetup from './CalendarSetup';

interface GoogleCalendarButtonProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
}

export default function GoogleCalendarButton({ onSuccess, onError }: GoogleCalendarButtonProps) {
  const [token, setToken] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      setToken(response.access_token);
      setShowSetup(true);
    },
    onError: (error) => onError?.(error),
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  });

  const handleSetupComplete = () => {
    setShowSetup(false);
    if (token) {
      onSuccess(token);
    }
  };

  if (showSetup && token) {
    return (
      <CalendarSetup
        token={token}
        onComplete={handleSetupComplete}
        onError={(error) => {
          setShowSetup(false);
          onError?.(error);
        }}
      />
    );
  }

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