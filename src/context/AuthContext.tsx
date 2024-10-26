import * as React from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, validateEmail, parseSupabaseError } from '../config/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (credentials: SignupCredentials) => {
    try {
      if (!validateEmail(credentials.email)) {
        throw new Error('Please use your UNCC email address (@charlotte.edu or @uncc.edu)');
      }

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

    } catch (error) {
      throw new Error(parseSupabaseError(error));
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      if (!validateEmail(credentials.email)) {
        throw new Error('Please use your UNCC email address (@charlotte.edu or @uncc.edu)');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;
    } catch (error) {
      throw new Error(parseSupabaseError(error));
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
      throw new Error(parseSupabaseError(error));
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
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

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}