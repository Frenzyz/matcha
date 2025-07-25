import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FloatingLeaves from '../components/FloatingLeaves';
import { supabase } from '../config/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL hash fragment or code parameter
    const checkForResetToken = async () => {
      try {
        setValidating(true);
        
        // First check for code parameter in the URL (Supabase PKCE flow)
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (code) {
          console.log('Found code parameter in URL, handling PKCE flow');
          await handleCodeExchange(code);
          return;
        }
        
        // If no code parameter, check for token in hash fragment
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const type = params.get('type');
          
          if (type === 'recovery' && accessToken) {
            console.log('Found recovery token in URL hash');
            validateRecoveryToken(hash.substring(1));
            return;
          }
        }
        
        // No valid token found
        setError('No valid recovery token found. Please request a password reset email from the login page.');
        setValidating(false);
        
      } catch (err) {
        console.error('Error processing reset token:', err);
        setError('Error processing your reset link. Please request a new password reset email.');
        setValidating(false);
      }
    };
    
    checkForResetToken();
  }, [location]);
  
  // Handle the code parameter exchange
  const handleCodeExchange = async (code: string) => {
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Code exchange error:', error);
        setError('Your password reset link has expired or is invalid. Please request a new one.');
        setValidating(false);
        return;
      }
      
      if (data?.session && data?.user) {
        // Store session info
        setToken(code);  // We'll use this when resetting password
        setUserEmail(data.user.email || null);
        console.log('Code exchange successful for user:', data.user.email);
        setValidating(false);
      } else {
        setError('Unable to authenticate with the provided code. Please request a new password reset link.');
        setValidating(false);
      }
    } catch (err) {
      console.error('Error exchanging code:', err);
      setError('Error processing your reset code. Please request a new one.');
      setValidating(false);
    }
  };
  
  // Validate the token and extract user information if possible
  const validateRecoveryToken = async (tokenString: string) => {
    try {
      // The correct way to validate a recovery token is to split the parameters 
      // and check if there's a valid access_token
      const params = new URLSearchParams(tokenString);
      const accessToken = params.get('access_token');
      const type = params.get('type');
      
      if (!accessToken || type !== 'recovery') {
        setError('Invalid recovery token format');
        setToken(null);
        setValidating(false);
        return;
      }
      
      // Validate the token using getUser
      const { data, error } = await supabase.auth.getUser(accessToken);
      
      if (error) {
        console.error('Token validation error:', error);
        setError('Your password reset link has expired or is invalid. Please request a new one.');
        setToken(null);
      } else if (data?.user) {
        // Store the full token string for later use with exchangeCodeForSession
        setToken(tokenString);
        setUserEmail(data.user.email || null);
        console.log('Token validated successfully for user:', data.user.email);
      } else {
        setError('Unable to validate recovery token. Please request a new password reset link.');
        setToken(null);
      }
      setValidating(false);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Unable to validate your reset link. Please request a new one.');
      setToken(null);
      setValidating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      if (!token) {
        throw new Error('Invalid or missing token');
      }
      
      // Check if we're using a code or token
      if (token.includes('access_token')) {
        // Using a token from hash fragment
        await resetPassword(newPassword, token);
      } else {
        // Using a code parameter
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (error) {
          throw error;
        }
      }
      
      setSuccess(true);
      setError('Your password has been reset successfully! You can now log in with your new password.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      if (errorMessage.includes('expired')) {
        setError('Your password reset link has expired. Please request a new one from the login page.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <FloatingLeaves />
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-3">
            <Leaf className="h-12 w-12 text-emerald-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Your Password
        </h2>
        {userEmail && (
          <p className="mt-2 text-center text-sm text-gray-600">
            For account: <span className="font-semibold">{userEmail}</span>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {validating ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-600">Validating your reset link...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className={`mb-6 p-3 rounded-md text-sm flex items-start gap-2 ${success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {!success && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                  <span>{error}</span>
                </div>
              )}
              
              {!success && (
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
                        disabled={!token || loading}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="At least 8 characters"
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
                        disabled={!token || loading}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading || !token}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Resetting Password...</span>
                        </div>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </div>
                </form>
              )}
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm text-emerald-600 hover:text-emerald-500"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
