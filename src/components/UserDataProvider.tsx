import React, { createContext, useContext, useCallback } from 'react';
import { useUser } from '../hooks/useUser';
import { UserProfile } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface UserDataContextType {
  userData: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateUserData: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refetch: () => Promise<UserProfile | null>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { userData, loading, error, updateUserData, refetch } = useUser();

  const handleRetry = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      // Error handling is managed by useUser hook
    }
  }, [refetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorMessage
          message={error}
          onRetry={handleRetry}
          onDismiss={() => {}} // Allow users to dismiss non-critical errors
        />
      </div>
    );
  }

  return (
    <UserDataContext.Provider value={{ userData, loading, error, updateUserData, refetch }}>
      {children}
    </UserDataContext.Provider>
  );
}
