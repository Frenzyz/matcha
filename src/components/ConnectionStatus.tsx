import React from 'react';
import { WifiOff } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';
import { supabase } from '../config/supabase';

export default function ConnectionStatus() {
  const isOnline = useConnection();

  React.useEffect(() => {
    if (isOnline) {
      // Get current session and reconnect Supabase realtime
      const updateAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      };
      updateAuth();
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
      <WifiOff size={16} />
      <span>You're offline. Changes will sync when you're back online.</span>
    </div>
  );
}