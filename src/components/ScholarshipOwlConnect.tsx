import React, { useState, useEffect } from 'react';
import { Key, Check, Loader2 } from 'lucide-react';
import { ScholarshipOwlService } from '../services/scholarshipOwl';
import { useAuth } from '../context/AuthContext';

export default function ScholarshipOwlConnect() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const connected = await ScholarshipOwlService.isConnected();
    setIsConnected(connected);
  };

  const handleConnect = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const success = await ScholarshipOwlService.connect(apiKey);
      if (success) {
        await ScholarshipOwlService.syncUserData(user.id);
        setIsConnected(true);
        setApiKey('');
      } else {
        setError('Failed to connect to ScholarshipOwl');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      await ScholarshipOwlService.disconnect(user.id);
      setIsConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        ScholarshipOwl Integration
      </h2>

      <div className="space-y-4">
        {!isConnected ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your ScholarshipOwl account to automatically sync your profile and scholarship applications.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your ScholarshipOwl API key"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={loading || !apiKey}
                className={`px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  (loading || !apiKey) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Check size={20} />
              <span>Connected to ScholarshipOwl</span>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                'Disconnect'
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}