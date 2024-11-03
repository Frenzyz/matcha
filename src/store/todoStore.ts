import { create } from 'zustand';
import { CategoryService } from '../services/categories';
import { logger } from '../utils/logger';

interface Category {
  id: string;
  user_id?: string;
  name: string;
  color: string;
}

interface TodoState {
  categories: Category[];
  addCategory: (userId: string, name: string, color: string) => Promise<void>;
  editCategory: (userId: string, index: number, name: string, color: string) => Promise<void>;
  deleteCategory: (userId: string, index: number) => Promise<void>;
  initializeCategories: (userId: string) => Promise<void>;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'upcoming',
    name: 'Upcoming',
    color: '#10B981'
  },
  {
    id: 'completed',
    name: 'Completed',
    color: '#6B7280'
  }
];

export const useTodoStore = create<TodoState>((set, get) => ({
  categories: [...DEFAULT_CATEGORIES],

  initializeCategories: async (userId: string) => {
    try {
      const customCategories = await CategoryService.fetchCategories(userId);
      set({ 
        categories: [
          ...DEFAULT_CATEGORIES,
          ...customCategories.filter(cat => 
            !DEFAULT_CATEGORIES.some(def => def.name === cat.name)
          )
        ] 
      });
    } catch (error) {
      logger.error('Error initializing categories:', error);
      set({ categories: [...DEFAULT_CATEGORIES] });
    }
  },

  addCategory: async (userId: string, name: string, color: string) => {
    if (!userId || !name || !color) {
      throw new Error('User ID, name, and color are required');
    }

    try {
      const state = get();
      const exists = state.categories.some(cat => 
        cat.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exists) {
        throw new Error('A category with this name already exists');
      }

      const newCategory = await CategoryService.addCategory(userId, name, color);
      set((state) => ({
        categories: [...state.categories, newCategory]
      }));
    } catch (error) {
      logger.error('Error adding category:', error);
      throw error;
    }
  },

  editCategory: async (userId: string, index: number, name: string, color: string) => {
    const state = get();
    if (index < DEFAULT_CATEGORIES.length) {
      throw new Error('Cannot edit default categories');
    }

    try {
      const category = state.categories[index];
      if (!category) {
        throw new Error('Category not found');
      }

      const updatedCategory = await CategoryService.updateCategory({
        ...category,
        user_id: userId,
        name,
        color
      });

      set((state) => {
        const newCategories = [...state.categories];
        newCategories[index] = updatedCategory;
        return { categories: newCategories };
      });
    } catch (error) {
      logger.error('Error editing category:', error);
      throw error;
    }
  },

  deleteCategory: async (userId: string, index: number) => {
    const state = get();
    if (index < DEFAULT_CATEGORIES.length) {
      throw new Error('Cannot delete default categories');
    }

    try {
      const category = state.categories[index];
      if (!category) {
        throw new Error('Category not found');
      }

      if (!category.id || !userId) {
        throw new Error('Category ID and user ID are required');
      }

      await CategoryService.deleteCategory(category.id, userId);
      set((state) => {
        const newCategories = [...state.categories];
        newCategories.splice(index, 1);
        return { categories: newCategories };
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }
}));