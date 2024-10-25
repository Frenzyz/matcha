import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Onboarding from './components/Onboarding';
import ChatBot from './components/ChatBot';
import TimeAnalysis from './components/TimeAnalysis';
import BackButton from './components/BackButton';
import { useThemeStore } from './store/themeStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useThemeStore();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? (
    <div className={isDarkMode ? 'dark' : ''}>
      <BackButton />
      {children}
    </div>
  ) : (
    <Navigate to="/login" />
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={
            <PrivateRoute>
              <Onboarding />
            </PrivateRoute>
          } />
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute>
              <ChatBot />
            </PrivateRoute>
          } />
          <Route path="/analysis" element={
            <PrivateRoute>
              <TimeAnalysis />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;