import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useThemeStore } from '../store/themeStore';

export default function TimeAnalysis() {
  const { isDarkMode } = useThemeStore();
  
  const data = [
    { name: 'Classes', value: 6, color: '#10B981' },
    { name: 'Study Time', value: 4, color: '#3B82F6' },
    { name: 'Events', value: 2, color: '#8B5CF6' },
    { name: 'Free Time', value: 4, color: '#EC4899' },
    { name: 'Sleep', value: 8, color: '#FF0000' }  // Updated to bright red
  ];

  return (
    <div className={`p-6 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold mb-6">Daily Time Distribution</h2>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}: {item.value} hours</span>
          </div>
        ))}
      </div>
    </div>
  );
}
