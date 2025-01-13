import { Assignment } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export class AssignmentService {
  static async fetchAssignments(userId: string): Promise<Assignment[]> {
    if (!userId) throw new Error('User ID is required');

    try {
      const { data: existingAssignments, error: fetchError } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (fetchError) {
        logger.error('Error fetching assignments:', fetchError);
        return this.getCachedAssignments();
      }

      // Update local cache
      if (existingAssignments) {
        localStorage.setItem('cached_assignments', JSON.stringify(existingAssignments));
      }

      // Check for late assignments
      const now = new Date();
      const updatedAssignments = existingAssignments?.map(assignment => {
        if (assignment.status !== 'completed' && new Date(assignment.due_date) < now) {
          return { ...assignment, status: 'late' };
        }
        return assignment;
      });

      // Update late assignments in the database
      const lateAssignments = updatedAssignments?.filter(
        assignment => assignment.status === 'late' && 
        existingAssignments.find(ea => ea.id === assignment.id)?.status !== 'late'
      );

      if (lateAssignments?.length) {
        await Promise.all(
          lateAssignments.map(assignment =>
            supabase
              .from('assignments')
              .update({ status: 'late', updated_at: new Date().toISOString() })
              .eq('id', assignment.id)
              .eq('user_id', userId)
          )
        );
      }

      return updatedAssignments || [];
    } catch (error) {
      logger.error('Error in fetchAssignments:', error);
      return this.getCachedAssignments();
    }
  }

  private static getCachedAssignments(): Assignment[] {
    try {
      const cached = localStorage.getItem('cached_assignments');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      logger.error('Error reading cached assignments:', error);
      return [];
    }
  }

  // Rest of the class implementation remains the same...
}
