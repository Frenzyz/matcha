import React, { useState } from 'react';
    import { X, Loader2 } from 'lucide-react';
    import { useAuth } from '../context/AuthContext';
    import { sha256 } from 'js-sha256';

    interface ReauthenticateModalProps {
      onClose: () => void;
      onSuccess: () => void;
    }

    export default function ReauthenticateModal({ onClose, onSuccess }: ReauthenticateModalProps) {
      const { user, login } = useAuth();
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [password, setPassword] = useState('');

      const handleReauthenticate = async () => {
        if (!user) {
          setError('User not authenticated');
          return;
        }

        try {
          setLoading(true);
          setError(null);
          const hashedPassword = sha256(password);
          await login({ email: user.email || '', password: hashedPassword });
          onSuccess();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to reauthenticate';
          setError(message);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Reauthenticate
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300">
                For security reasons, please re-enter your password to access Matcha Wallet.
              </p>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleReauthenticate}
                disabled={loading}
                className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Reauthenticate'
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }
