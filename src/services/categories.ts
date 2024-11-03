import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export class CategoryService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly CACHE_KEY = 'cached_categories';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async fetchCategories(userId: string): Promise<Category[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check cache first
      const cached = this.getCachedCategories();
      if (cached && cached.timestamp > Date.now() - this.CACHE_DURATION) {
        return cached.categories;
      }

      const { data, error } = await retryOperation(
        () => supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY,
          onRetry: (attempt) => {
            logger.warn(`Retrying categories fetch (attempt ${attempt}/${this.MAX_RETRIES})`);
          }
        }
      );

      if (error) throw error;

      // If no categories exist, create default ones
      if (!data || data.length === 0) {
        const defaultCategories = await this.createDefaultCategories(userId);
        return defaultCategories;
      }

      // Update cache
      this.cacheCategories(data);
      return data;
    } catch (error) {
      logger.error('Error fetching categories:', error);
      // Return cached categories as fallback
      const cached = this.getCachedCategories();
      return cached ? cached.categories : this.getDefaultCategoryData(userId);
    }
  }

  static async addCategory(userId: string, name: string, color: string): Promise<Category> {
    if (!userId || !name || !color) {
      throw new Error('User ID, name, and color are required');
    }

    try {
      const newCategory = {
        user_id: userId,
        name: name.trim(),
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await retryOperation(
        () => supabase
          .from('categories')
          .insert([newCategory])
          .select()
          .single(),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;
      if (!data) throw new Error('Failed to create category');

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
      return data;
    } catch (error) {
      logger.error('Error adding category:', error);
      throw error;
    }
  }

  static async updateCategory(category: Category): Promise<Category> {
    if (!category.id || !category.user_id) {
      throw new Error('Category ID and user ID are required');
    }

    try {
      const { data, error } = await retryOperation(
        () => supabase
          .from('categories')
          .update({
            name: category.name.trim(),
            color: category.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', category.id)
          .eq('user_id', category.user_id)
          .select()
          .single(),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;
      if (!data) throw new Error('Failed to update category');

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
      return data;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  static async deleteCategory(categoryId: string, userId: string): Promise<void> {
    if (!categoryId || !userId) {
      throw new Error('Category ID and user ID are required');
    }

    try {
      const { error } = await retryOperation(
        () => supabase
          .from('categories')
          .delete()
          .eq('id', categoryId)
          .eq('user_id', userId),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;

      // Invalidate cache
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  private static async createDefaultCategories(userId: string): Promise<Category[]> {
    try {
      const defaultCategories = this.getDefaultCategoryData(userId);
      const { data, error } = await retryOperation(
        () => supabase
          .from('categories')
          .insert(defaultCategories)
          .select(),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;
      if (!data) throw new Error('Failed to create default categories');

      // Cache the new categories
      this.cacheCategories(data);
      return data;
    } catch (error) {
      logger.error('Error creating default categories:', error);
      return this.getDefaultCategoryData(userId);
    }
  }

  private static getDefaultCategoryData(userId: string): Category[] {
    return [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Upcoming',
        color: '#10B981',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Completed',
        color: '#6B7280',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  private static getCachedCategories(): { categories: Category[]; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error reading cached categories:', error);
      return null;
    }
  }

  private static cacheCategories(categories: Category[]): void {
    try {
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          categories,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      logger.error('Error caching categories:', error);
    }
  }
}