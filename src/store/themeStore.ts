import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeColors {
  primary: string;
  hover: string;
  light: string;
}

const themeColors: Record<string, ThemeColors> = {
  emerald: {
    primary: '#10B981',
    hover: '#059669',
    light: '#D1FAE5'
  },
  blue: {
    primary: '#3B82F6',
    hover: '#2563EB',
    light: '#DBEAFE'
  },
  purple: {
    primary: '#8B5CF6',
    hover: '#7C3AED',
    light: '#EDE9FE'
  },
  pink: {
    primary: '#EC4899',
    hover: '#DB2777',
    light: '#FCE7F3'
  }
};

interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string) => void;
  applyTheme: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      primaryColor: 'emerald',
      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.isDarkMode;
          document.documentElement.classList.toggle('dark', newDarkMode);
          return { isDarkMode: newDarkMode };
        });
      },
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        get().applyTheme(color);
      },
      applyTheme: (color) => {
        const colors = themeColors[color];
        if (colors) {
          document.documentElement.style.setProperty('--color-primary', colors.primary);
          document.documentElement.style.setProperty('--color-primary-hover', colors.hover);
          document.documentElement.style.setProperty('--color-primary-light', colors.light);
        }
      }
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.isDarkMode);
          state.applyTheme(state.primaryColor);
        }
      }
    }
  )
);
