import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ChatBot from './components/ChatBot';
import VirtualParent from './pages/VirtualParent';
import TimeAnalysis from './components/TimeAnalysis';
import Scholarships from './pages/Scholarships';
import { UserDataProvider } from './context/UserDataProvider';

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

export default function App() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={
              <PrivateRoute>
                <div className="page-transition">
                  <Dashboard />
                </div>
              </PrivateRoute>
            } />
            <Route path="/chat" element={
              <PrivateRoute>
                <div className="page-transition">
                  <ChatBot />
                </div>
              </PrivateRoute>
            } />
            <Route path="/virtual-parent" element={
              <PrivateRoute>
                <div className="page-transition">
                  <VirtualParent />
                </div>
              </PrivateRoute>
            } />
            <Route path="/analysis" element={
              <PrivateRoute>
                <div className="page-transition">
                  <TimeAnalysis />
                </div>
              </PrivateRoute>
            } />
            <Route path="/scholarships" element={
              <PrivateRoute>
                <div className="page-transition">
                  <Scholarships />
                </div>
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <div className="page-transition">
                  <Settings />
                </div>
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}