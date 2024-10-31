import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
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

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (credentials: SignupCredentials) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            student_id: credentials.studentId
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
            student_id: credentials.studentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (profileError) throw profileError;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Signup failed');
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  const value = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}