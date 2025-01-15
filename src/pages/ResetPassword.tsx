import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Leaf } from 'lucide-react';
    import { useAuth } from '../context/AuthContext';

    export default function ResetPassword() {
      const navigate = useNavigate();
      const { resetPassword } = useAuth();
      const [newPassword, setNewPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const [success, setSuccess] = useState(false);
      const [token, setToken] = useState<string | null>(null);

      useEffect(() => {
        // Extract token from hash fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const tokenParam = params.get('token');
        if (tokenParam) {
          setToken(tokenParam);
        } else {
          setError('Invalid or missing token');
        }
      }, []);

      const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setSuccess(false);

        if (newPassword !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        try {
          if (!token) {
            throw new Error('Invalid or missing token');
          }
          await resetPassword(newPassword, token);
          setSuccess(true);
          setError('Your password has been reset successfully. Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to reset password');
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-100 p-3">
                <Leaf className="text-emerald-600" size={48} />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
              {error && (
                <div className={`mb-4 p-2 rounded ${success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'} text-sm`}>
                  {error}
                </div>
              )}
              
              <form className="space-y-6" onSubmit={handleResetPassword}>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }
