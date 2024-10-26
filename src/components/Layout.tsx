import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useThemeStore } from '../store/themeStore';
import ConnectionStatus from './ConnectionStatus';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isDarkMode } = useThemeStore();
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/canvas-setup'].includes(location.pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <ConnectionStatus />
        <div className="pt-16 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}