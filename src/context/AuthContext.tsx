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
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          });

          if (error) throw error;
          if (!data.user) throw new Error('Login failed');

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
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          });
          if (error) throw error;
        } catch (error) {
          logger.error('Forgot password error:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to send reset link');
        }
      };

      const resetPassword = async (newPassword: string, token: string) => {
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
            email_confirm: true,
            data: {
              token: token
            }
          });
          if (error) throw error;
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
        loading
      };

      return (
        <AuthContext.Provider value={value}>
          {children}
        </AuthContext.Provider>
      );
    }
