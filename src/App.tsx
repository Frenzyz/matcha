import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import TimeAnalysis from './components/TimeAnalysis';
import Scholarships from './pages/Scholarships';
import GroupStudy from './pages/GroupStudy';
import { UserDataProvider } from './context/UserDataProvider';
import Landing from './pages/Landing';
import About from './pages/About';
import New from './pages/New';
import Upcoming from './pages/Upcoming';
import { useLinking } from './utils/linking';
import ResetPasswordModal from './components/ResetPasswordModal';
import { supabase } from './config/supabase';
import Budgeting from './pages/Budgeting';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <UserDataProvider>
      <Layout>{children}</Layout>
    </UserDataProvider>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function MainApp() {
  const { loginWithToken, session } = useAuth();
  const navigate = useNavigate();
  const { subscribe } = useLinking();

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(async (url) => {
      const parsedUrl = new URL(url);
      const type = parsedUrl.searchParams.get('type');
      const token = parsedUrl.searchParams.get('token');

      if (type === 'recovery' && token) {
        console.log('Received reset token:', token); // Debug log
        setResetToken(token);
        setShowResetModal(true);
        return; // Avoid logging in during password recovery flow
      }

      const access_token = parsedUrl.searchParams.get('access_token');
      const refresh_token = parsedUrl.searchParams.get('refresh_token');

      if (access_token && refresh_token) {
        await loginWithToken({ access_token, refresh_token });
        navigate('/dashboard', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [subscribe, loginWithToken, navigate]);

  useEffect(() => {
    if (session?.user) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, updatedSession) => {
          if (event === 'PASSWORD_RECOVERY' && updatedSession?.access_token) {
            console.log('Supabase password recovery event detected');
            setResetToken(updatedSession.access_token);
            setShowResetModal(true);
          }
        }
      );

      return () => {
        if (authListener && typeof authListener.unsubscribe === 'function') {
          authListener.unsubscribe();
        }
      };
    }
  }, [session?.user]);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        {/* Other Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Reset Password Modal */}
      {showResetModal && resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => {
            setShowResetModal(false);
            setResetToken(null);
            navigate('/login', { replace: true });
          }}
        />
      )}
    </>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <MainApp />
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}
