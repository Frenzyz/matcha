import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, validateEmail } from '../config/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: FirebaseUser | null;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (credentials: SignupCredentials) => {
    if (!validateEmail(credentials.email)) {
      throw new Error('Please use your @charlotte.edu email address');
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      studentId: credentials.studentId,
      email: credentials.email,
      createdAt: new Date().toISOString()
    });
  };

  const login = async (credentials: LoginCredentials) => {
    if (!validateEmail(credentials.email)) {
      throw new Error('Please use your @charlotte.edu email address');
    }

    await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
  };

  const logout = async () => {
    await signOut(auth);
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}