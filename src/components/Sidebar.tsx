import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Settings, GraduationCap, Users, Wallet, Clock, Search, UserPlus } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useFeatureStore } from '../store/featureStore';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { isDarkMode } = useThemeStore();
  const { groupStudyEnabled } = useFeatureStore();

  const links = [
    { icon: Calendar, label: 'Dashboard', path: '/dashboard' },
    { icon: Clock, label: 'Time Management', path: '/time-management' },
    ...(groupStudyEnabled ? [{ 
      icon: Users, 
      label: 'Group Study (Beta)', 
      path: '/group-study' 
    }] : []),
    ...(groupStudyEnabled ? [{ 
      icon: Search, 
      label: 'Find Study Partners', 
      path: '/discover-partners' 
    }] : []),
    ...(groupStudyEnabled ? [{ 
      icon: UserPlus, 
      label: 'Friends', 
      path: '/friends' 
    }] : []),
    { icon: GraduationCap, label: 'Scholarships', path: '/scholarships' },
    { icon: Wallet, label: 'Matcha Wallet', path: '/budgeting' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];



  return (
    <div 
      className={`fixed left-0 h-full transition-all duration-300 ${
        isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
      } ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg z-40`}
    >
      <div className="p-4 mt-16">
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
