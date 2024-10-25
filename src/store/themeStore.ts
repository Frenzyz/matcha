import { create } from 'zustand';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ThemeState {
  isDarkMode: boolean;
  primaryColor: string;
  toggleDarkMode: () => void;
  setPrimaryColor: (color: string, userId: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  primaryColor: 'emerald',
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setPrimaryColor: async (color: string, userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      theme: color
    });
    set({ primaryColor: color });
  },
}));