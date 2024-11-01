import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TodoState {
  isAdvancedMode: boolean;
  timeSpan: number;
  categories: string[];
  setAdvancedMode: (value: boolean) => void;
  setTimeSpan: (span: number) => void;
  addCategory: (name: string) => void;
  editCategory: (index: number, name: string) => void;
  deleteCategory: (index: number) => void;
  reorderCategories: (categories: string[]) => void;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      isAdvancedMode: false,
      timeSpan: 1, // Default to next 24 hours
      categories: ['Upcoming', 'Completed'],
      setAdvancedMode: (value) => set({ isAdvancedMode: value }),
      setTimeSpan: (timeSpan) => set({ timeSpan }),
      addCategory: (name) => 
        set((state) => ({ 
          categories: [...state.categories, name] 
        })),
      editCategory: (index, name) =>
        set((state) => ({
          categories: state.categories.map((cat, i) => 
            i === index ? name : cat
          )
        })),
      deleteCategory: (index) =>
        set((state) => ({
          categories: state.categories.filter((_, i) => i !== index)
        })),
      reorderCategories: (categories) => set({ categories })
    }),
    {
      name: 'todo-storage',
      partialize: (state) => ({
        isAdvancedMode: state.isAdvancedMode,
        timeSpan: state.timeSpan,
        categories: state.categories
      })
    }
  )
);