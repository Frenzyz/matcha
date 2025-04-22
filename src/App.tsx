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
import VerifyOtp from './components/VerifyOtp';
import SupabaseDebug from './components/SupabaseDebug';
import DebugPage from './pages/DebugPage';

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
        setResetToken(token);
        setShowResetModal(true);
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
        <Route
          path="/about"
          element={
            <PublicRoute>
              <About />
            </PublicRoute>
          }
        />
        <Route
          path="/new"
          element={
            <PublicRoute>
              <New />
            </PublicRoute>
          }
        />
        <Route
          path="/upcoming"
          element={
            <PublicRoute>
              <Upcoming />
            </PublicRoute>
          }
        />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-otp"
          element={
            <PublicRoute>
              <VerifyOtp />
            </PublicRoute>
          }
        />

        {/* Debug Route - only in development */}
        {import.meta.env.DEV && (
          <Route
            path="/debug"
            element={<DebugPage />}
          />
        )}

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <PrivateRoute>
              <TimeAnalysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/group-study"
          element={
            <PrivateRoute>
              <GroupStudy />
            </PrivateRoute>
          }
        />
        <Route
          path="/scholarships"
          element={
            <PrivateRoute>
              <Scholarships />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/budgeting"
          element={
            <PrivateRoute>
              <Budgeting />
            </PrivateRoute>
          }
        />
				<Route
          path="/reset-password"
          element={
            <PrivateRoute>
              <ResetPasswordModal />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showResetModal && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => {
            setShowResetModal(false);
            setResetToken(null);
            navigate('/login', { replace: true });
          }}
        />
      )}
      
      {/* Supabase Debug Component (only in development) */}
      {import.meta.env.DEV && <SupabaseDebug />}
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
