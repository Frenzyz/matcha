import React from 'react';
import { Palette } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

interface ColorTheme {
  name: string;
  color: string;
  bgClass: string;
  hoverClass: string;
}

const colorThemes: ColorTheme[] = [
  { 
    name: 'emerald', 
    color: '#10B981',
    bgClass: 'bg-emerald-500',
    hoverClass: 'hover:bg-emerald-600'
  },
  { 
    name: 'blue', 
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    hoverClass: 'hover:bg-blue-600'
  },
  { 
    name: 'purple', 
    color: '#8B5CF6',
    bgClass: 'bg-purple-500',
    hoverClass: 'hover:bg-purple-600'
  },
  { 
    name: 'pink', 
    color: '#EC4899',
    bgClass: 'bg-pink-500',
    hoverClass: 'hover:bg-pink-600'
  }
];

export default function ColorPicker() {
  const { setPrimaryColor } = useThemeStore();
  const { user } = useAuth();

  const handleColorChange = async (theme: ColorTheme) => {
    setPrimaryColor(theme.name);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        themeColor: theme.name
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Color Theme
      </h3>
      <div className="flex justify-start gap-4">
        {colorThemes.map((theme) => (
          <button
            key={theme.name}
            onClick={() => handleColorChange(theme)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${theme.bgClass}`}
            title={theme.name}
          >
            <Palette className="text-white" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}