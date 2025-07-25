import * as React from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string, token: string) => Promise<void>;
  loginWithToken: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
  signInWithOtp: (email: string, shouldCreateUser?: boolean) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  loading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
  studentId: string;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          logger.info('Auth state changed:', event);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setUser(newSession?.user ?? null);
            setSession(newSession);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        });

        setInitialized(true);
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error('Error initializing auth:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthError = (error: AuthError): never => {
    logger.error('Auth error:', error);
    throw new Error(error.message);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Log authentication attempt (without sensitive data)
      logger.info('Attempting login', { email: credentials.email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        logger.error('Login error from Supabase:', error);
        throw error;
      }
      
      if (!data.user) {
        logger.error('Login succeeded but no user returned');
        throw new Error('Login failed - no user returned');
      }

      logger.info('Login successful', { 
        userId: data.user.id,
        email: data.user.email
      });

      setUser(data.user);
      setSession(data.session);

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Create profile if it doesn't exist
      if (!profile && !profileError) {
        logger.info('Creating profile for user', { userId: data.user.id });
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (createError) {
          logger.error('Profile creation failed:', createError);
          throw new Error('Failed to create user profile');
        }
      } else if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which we handle above
        logger.error('Error checking for profile:', profileError);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        handleAuthError(error);
      }
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${window.location.origin}/reset-password`,
          data: {
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            student_id: credentials.studentId
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      setUser(authData.user);
      setSession(authData.session);

      // Create profile after successful signup
      if (authData.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: authData.user.email,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            student_id: credentials.studentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          logger.error('Profile creation failed:', profileError);
          throw new Error('Failed to create user profile');
        }
      }
    } catch (error) {
      if (error instanceof AuthError) {
        handleAuthError(error);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!initialized) {
        throw new Error('Auth not initialized');
      }

      if (user) {
        // Update last seen before logging out
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear auth state
      setUser(null);
      setSession(null);
    } catch (error) {
      logger.error('Logout error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to log out');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Valid email is required');
      }
      
      logger.info('Sending password reset email to:', email);
      
      // Create correct redirect URL based on environment
      const isLocalhost = window.location.hostname === 'localhost';
      const protocol = isLocalhost ? 'http' : 'https';
      const redirectTo = `${protocol}://${window.location.host}/reset-password`;
      
      logger.info('Using redirect URL:', redirectTo);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      });
      
      if (error) {
        logger.error('Forgot password error:', error);
        throw error;
      }
      
      logger.info('Password reset email sent successfully');
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send reset link');
    }
  };

  const resetPassword = async (newPassword: string, token: string) => {
    try {
      console.log('Attempting to reset password with recovery token');
      
      if (!newPassword || typeof newPassword !== 'string') {
        throw new Error('New password is required');
      }
      
      if (!token || typeof token !== 'string') {
        throw new Error('Valid token is required');
      }
      
      // For password resets via recovery tokens, we need to use a different approach
      // than normal password updates
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(token);
      
      if (error) {
        logger.error('Error exchanging recovery token for session:', error);
        throw error;
      }
      
      if (!data.session) {
        throw new Error('Failed to establish session with recovery token');
      }
      
      // Now update password with the active session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        logger.error('Error updating password:', updateError);
        throw updateError;
      }
      
      logger.info('Password reset successful');
      
      // Update local state with the session
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
      }
      
      // Don't return anything - function should be void
    } catch (error) {
      logger.error('Reset password error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const loginWithToken = async (tokens: { access_token: string; refresh_token: string }) => {
    try {
      const { data, error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      setUser(data.user);
      setSession(data.session);
    } catch (error) {
      logger.error('Login with token error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to login with token');
    }
  };

  const signInWithOtp = async (email: string, shouldCreateUser = true) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser,
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      if (error) throw error;
    } catch (error) {
      logger.error('Sign in with OTP error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send OTP');
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });
      if (error) throw error;
      setUser(data.user);
      setSession(data.session);
    } catch (error) {
      logger.error('Verify OTP error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to verify OTP');
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    loginWithToken,
    signInWithOtp,
    verifyOtp,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
