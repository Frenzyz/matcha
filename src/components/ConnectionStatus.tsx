import React, { useState, useEffect } from 'react';
import { WifiOff, Database, RefreshCw } from 'lucide-react';
import { useConnection } from '../hooks/useConnection';

export default function ConnectionStatus() {
  const { isOnline, isSupabaseConnected, checkConnection } = useConnection();
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Track tab visibility to prevent false offline states
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Don't show connection issues when tab is hidden (false positives)
  if (!isTabVisible) return null;
  if (isOnline && isSupabaseConnected) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <WifiOff size={16} />
          <span>You're offline</span>
          <button 
            onClick={() => window.location.reload()}
            className="ml-2 p-1 hover:bg-red-600 rounded-full transition-colors"
            title="Refresh page"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}
      
      {isOnline && !isSupabaseConnected && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Database size={16} />
          <span>Reconnecting to server...</span>
          <button 
            onClick={() => checkConnection()}
            className="ml-2 p-1 hover:bg-yellow-600 rounded-full transition-colors"
            title="Retry connection"
          >
            <RefreshCw size={16} className="animate-spin" />
          </button>
        </div>
      )}
    </div>
  );
}
