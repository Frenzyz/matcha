import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * This component is for development only, to help debug Supabase connection issues
 */
export default function SupabaseDebug() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('User');
  const [studentId, setStudentId] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<{url: string, key: string}>({
    url: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured (hidden)' : 'Not configured'
  });
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');

  // Check connection status on load
  useEffect(() => {
    const checkInitialConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        setConnectionStatus(error ? `Error: ${error.message}` : 'Connected');
      } catch (err) {
        setConnectionStatus(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    checkInitialConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection...');
    
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        throw error;
      }
      
      setResult(`Connection successful: ${JSON.stringify(data)}`);
      logger.info('Supabase connection test successful', data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult(`Connection error: ${message}`);
      logger.error('Supabase connection test failed', err);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      setResult(`Login successful: ${JSON.stringify({
        user: data.user?.email,
        session: !!data.session,
        userId: data.user?.id
      })}`);
      logger.info('Supabase login test successful', {
        email: data.user?.email,
        hasSession: !!data.session
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult(`Login error: ${message}`);
      logger.error('Supabase login test failed', err);
    } finally {
      setLoading(false);
    }
  };

  const testSignup = async () => {
    setLoading(true);
    setResult('Testing signup...');
    
    try {
      // Check if user exists by trying a sign-in (will fail but we can check the error)
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: 'temp-password-for-check-only'
      });
      
      // If error doesn't contain "Invalid login credentials", user likely doesn't exist
      if (checkError && !checkError.message.includes('Invalid login credentials')) {
        // It's possible the user exists, but there's another issue
        logger.warn('Could not verify if user exists, proceeding with signup attempt:', checkError);
      } else if (checkError && checkError.message.includes('Invalid login credentials')) {
        // The user likely exists (got invalid credentials rather than user not found)
        logger.warn('User might already exist, proceeding with signup anyway');
      }
      
      // Create the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            student_id: studentId || 'TEST123'
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Create profile record manually if needed
      if (data.user && data.session) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              first_name: firstName,
              last_name: lastName,
              student_id: studentId || 'TEST123',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
            
          if (profileError) {
            logger.warn('Could not create profile record:', profileError);
          }
        } catch (profileErr) {
          logger.error('Error creating profile:', profileErr);
        }
      }
      
      setResult(`Signup ${data.user ? 'successful' : 'pending'}: ${JSON.stringify({
        user: data.user?.email,
        session: !!data.session,
        userId: data.user?.id,
        confirmationRequired: !data.session
      })}`);
      logger.info('Supabase signup test', {
        email: data.user?.email,
        hasSession: !!data.session
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult(`Signup error: ${message}`);
      logger.error('Supabase signup test failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <>
      {isVisible ? (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-md border border-gray-200 max-w-md z-50 overflow-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Supabase Debug</h3>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 mb-4 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <div><strong>URL:</strong> {supabaseConfig.url}</div>
              <div><strong>Key:</strong> {supabaseConfig.key}</div>
              <div><strong>Status:</strong> {connectionStatus}</div>
            </div>
            <button 
              onClick={testConnection}
              disabled={loading}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 w-full"
            >
              Test Connection
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-2 py-1 text-xs border rounded w-full"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="px-2 py-1 text-xs border rounded w-full"
            />
            <div className="flex space-x-2">
              <button 
                onClick={testLogin}
                disabled={loading || !email || !password}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex-1"
              >
                Test Login
              </button>
            </div>
          </div>
          
          <div className="space-y-2 mb-4 p-2 bg-gray-50 rounded">
            <h4 className="text-xs font-semibold">Create Test User</h4>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="px-2 py-1 text-xs border rounded w-full"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="px-2 py-1 text-xs border rounded w-full"
            />
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID (optional)"
              className="px-2 py-1 text-xs border rounded w-full"
            />
            <button 
              onClick={testSignup}
              disabled={loading || !email || !password}
              className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 w-full"
            >
              Create Test User
            </button>
          </div>
          
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all max-h-40 overflow-auto">
            {result || 'Results will appear here'}
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            This component only appears in development mode
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 right-4 z-50 p-2 bg-emerald-500 text-white rounded-md shadow-lg hover:bg-emerald-600 transition-colors"
        >
          <span className="text-xs font-medium">Debug</span>
        </button>
      )}
    </>
  );
} 