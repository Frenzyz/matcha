import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, PieChart, Settings } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export default function Sidebar() {
  const location = useLocation();
  const { isDarkMode } = useThemeStore();

  const links = [
    { icon: Calendar, label: 'Calendar', path: '/' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: PieChart, label: 'Time Analysis', path: '/analysis' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  return (
    <div className={`w-64 h-screen fixed left-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="p-4">
        <div className="space-y-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'}`
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}