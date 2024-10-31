import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatBot from './ChatBot';
import { useThemeStore } from '../store/themeStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isDarkMode } = useThemeStore();
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/canvas-setup'].includes(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isSidebarOpen={isSidebarOpen} 
        />
        
        <div className="flex">
          <Sidebar isOpen={isSidebarOpen} />
          
          <main 
            className={`flex-1 transition-all duration-300 ${
              isSidebarOpen ? 'ml-64' : 'ml-0'
            } pt-16`}
          >
            {children}
          </main>
        </div>

        {/* Chat Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-theme-primary text-white rounded-full shadow-lg hover:bg-theme-hover transition-colors"
        >
          {isChatOpen ? (
            <X size={24} />
          ) : (
            <MessageSquare size={24} />
          )}
        </button>

        {/* Chat Window */}
        {isChatOpen && (
          <div className="fixed bottom-20 right-4 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 flex flex-col">
            <div className="p-3 bg-theme-primary text-white flex justify-between items-center">
              <span className="font-medium">AI Assistant</span>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}