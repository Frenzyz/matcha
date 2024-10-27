import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import EventCalendar from '../components/Calendar';
import Recommendations from '../components/Recommendations';
import Assignments from '../components/Assignments';
import { useThemeStore } from '../store/themeStore';

export default function Dashboard() {
  const { isDarkMode } = useThemeStore();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-sm p-6`}>
                <EventCalendar />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-sm p-6`}>
                <h2 className="text-2xl font-bold mb-6">Recommended Events</h2>
                <Recommendations />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-sm p-6`}>
                <h2 className="text-2xl font-bold mb-6">Upcoming Assignments</h2>
                <Assignments />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}