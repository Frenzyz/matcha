import React, { useState } from 'react';
    import { Link, useLocation, useNavigate } from 'react-router-dom';
    import { Calendar, PieChart, Settings, GraduationCap, Users, Wallet } from 'lucide-react';
    import { useThemeStore } from '../store/themeStore';
    import { useFeatureStore } from '../store/featureStore';
    import ReauthenticateModal from './ReauthenticateModal';

    interface SidebarProps {
      isOpen: boolean;
    }

    export default function Sidebar({ isOpen }: SidebarProps) {
      const location = useLocation();
      const navigate = useNavigate();
      const { isDarkMode } = useThemeStore();
      const { groupStudyEnabled } = useFeatureStore();
      const [showReauthModal, setShowReauthModal] = useState(false);

      const links = [
        { icon: Calendar, label: 'Dashboard', path: '/dashboard' },
        { icon: PieChart, label: 'Time Analysis', path: '/analysis' },
        ...(groupStudyEnabled ? [{ 
          icon: Users, 
          label: 'Group Study (Beta)', 
          path: '/group-study' 
        }] : []),
        { icon: GraduationCap, label: 'Scholarships', path: '/scholarships' },
        { icon: Wallet, label: 'Matcha Wallet', path: '/budgeting' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];

      const handleWalletClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowReauthModal(true);
      };

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
                    onClick={(e) => {
                      if (link.path === '/budgeting') {
                        e.preventDefault();
                        handleWalletClick(e);
                      }
                    }}
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

          {showReauthModal && (
            <ReauthenticateModal
              onClose={() => setShowReauthModal(false)}
              onSuccess={() => {
                setShowReauthModal(false);
                navigate('/budgeting');
              }}
            />
          )}
        </div>
      );
    }
