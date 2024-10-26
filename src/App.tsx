import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Onboarding from './components/Onboarding';
import ChatBot from './components/ChatBot';
import TimeAnalysis from './components/TimeAnalysis';
import CanvasUrlPrompt from './components/CanvasUrlPrompt';
import { useUser } from './hooks/useUser';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { userData, loading: userLoading } = useUser();
  
  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Redirect to Canvas URL prompt if not set up
  if (userData && !userData.setup_completed && !window.location.pathname.includes('/canvas-setup')) {
    return <Navigate to="/canvas-setup" />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/canvas-setup" element={
            <PrivateRoute>
              <div className="page-transition">
                <CanvasUrlPrompt />
              </div>
            </PrivateRoute>
          } />
          <Route path="/onboarding" element={
            <PrivateRoute>
              <div className="page-transition">
                <Onboarding />
              </div>
            </PrivateRoute>
          } />
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
          <Route path="/analysis" element={
            <PrivateRoute>
              <div className="page-transition">
                <TimeAnalysis />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;