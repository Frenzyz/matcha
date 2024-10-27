import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../hooks/useUser';
import { supabase } from '../config/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { userData } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  React.useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setNotifications(data);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    loadNotifications();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="bg-theme-primary text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Leaf size={28} />
            <span className="text-xl font-bold">Matcha</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className="relative hover:text-white/80 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-1 text-gray-700">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="font-medium">{notif.title}</div>
                        <p className="text-sm text-gray-500">{notif.message}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={toggleMenu}
                className="flex items-center gap-2 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {userData?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </button>

              {menuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}