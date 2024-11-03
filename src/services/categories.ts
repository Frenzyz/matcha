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
            logger.warn(`Retrying categories fetch (attempt ${attempt})`);
          }
        }
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  static async addCategory(userId: string, name: string, color: string): Promise<Category> {
    if (!userId || !name || !color) {
      throw new Error('User ID, name, and color are required');
    }

    try {
      // Check if category already exists
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        throw new Error(`Category "${name}" already exists`);
      }

      const { data, error } = await retryOperation(
        () => supabase
          .from('categories')
          .insert([{
            user_id: userId,
            name: name.trim(),
            color,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single(),
        {
          maxAttempts: this.MAX_RETRIES,
          delay: this.RETRY_DELAY
        }
      );

      if (error) throw error;
      if (!data) throw new Error('Failed to create category');

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
      // Check if new name conflicts with existing category
      if (category.name) {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', category.user_id)
          .eq('name', category.name)
          .neq('id', category.id)
          .maybeSingle();

        if (existing) {
          throw new Error(`Category "${category.name}" already exists`);
        }
      }

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
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }
}